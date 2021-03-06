/**
 *
 * ContentEditor
 *
 */

import React from 'react';
import PropTypes from 'prop-types'
import classNames from 'classnames'
import enhanceWithClickOutside from 'react-onclickoutside'
import { Map } from 'immutable';
import { Prompt } from 'react-router-dom'

import { EditorState, Entity, DefaultDraftBlockRenderMap, convertToRaw, convertFromRaw } from 'draft-js';
import createInlinePlugin from './customPlugins/inline-plugin';
import createBlockPlugin from './customPlugins/block-plugin';
import createToolbarPlugin, { Separator } from './customPlugins/toolbar-plugin'
import Editor from './customPlugins/editor-plugin';
import createContentLinkPlugin, { ContentLinkButton } from './customPlugins/content-link-plugin'
import createLinkPlugin, { LinkButton } from './customPlugins/link-plugin'
import createLinkifyPlugin from './customPlugins/linkify-plugin'
import createMediaPlugin from './customPlugins/media-plugin'
import createUploadPlugin from './customPlugins/upload-plugin'
import createLatexPlugin from './customPlugins/latex-plugin'

import createImagePlugin from './customPlugins/image-plugin';

import createAutoListPlugin from './customPlugins/list-plugin'

import './styles.scss';
import 'draft-js/dist/Draft.css'

import { BoldButton, ItalicButton, UnderlineButton, MonospaceButton } from './customPlugins/inline-plugin'

import EditorBold from 'material-ui/svg-icons/editor/format-bold';
import EditorItalic from 'material-ui/svg-icons/editor/format-italic';
import EditorUnderlined from 'material-ui/svg-icons/editor/format-underlined';

const iconStyle = {
    height: '2.5rem',
    width: '2.5rem',
    verticalAlign: 'middle',
}

// import getMuiTheme from 'material-ui/styles/getMuiTheme';
import getMuiTheme from '../../containers/App/muitheme.js';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import ContentEditorShortcuts from '../ContentEditorShortcuts'

import asyncEach from 'async/each'
import parallel from 'async/parallel'
import debounce from '../../utils/debounce'

const wrapMui = (Component) => (
    (props) => (
        <MuiThemeProvider muiTheme={getMuiTheme()}>
            <Component {...props} />
        </MuiThemeProvider>
    )
)

// TODO: very ugly, instead, let toolbar-plugin render in the react tree, not separate from it (use hide or something) - 2016-08-04
const BoldButtonWIcon = wrapMui((props) => (
    <BoldButton {...props} label={
        <EditorBold 
            style={iconStyle} 
            color="#fff"
        />
    }/>
))
const ItalicButtonWIcon = wrapMui((props) => (
    <ItalicButton {...props} label={
        <EditorItalic 
            style={iconStyle} 
            color="#fff"
        />
    }/>
))
const UnderlineButtonWIcon = wrapMui((props) => (
    <UnderlineButton {...props} label={
        <EditorUnderlined
            style={iconStyle} 
            color="#fff"
        />
    }/>
))

const toolbarTheme = {
    'toolbar': 'ContentEditor-hoverbar',
    'toolbar-item': 'ContentEditor-hoverbar-item',
    'toolbar-item-active': 'ContentEditor-hoverbar-item-active',
}

import { Provider, connect } from 'react-redux'
import { removeEdge } from '../../actions/node'
import { showAddRelationWindow } from '../../actions/ui'

// TODO: set these in a container component - 2017-09-16
import ConnectWindow from '../../components/ConnectWindow'
import AddPictureWindow from '../../components/AddPictureWindow'
import AddVideoWindow from '../../components/AddVideoWindow'
import AddAudioWindow from '../../components/AddAudioWindow'
import AddRelationWindow from '../../components/AddRelationWindow'
import ContentEditorToolbar from '../../components/ContentEditorToolbar'

function createInitialEditorState(initialEditorState) {
    return initialEditorState ?
        EditorState.createWithContent(convertFromRaw(JSON.parse(initialEditorState)))
            :  EditorState.createEmpty()
}

// TODO: separate method - 2016-10-28
function getAllEntities(editorState) {
    const contentState = editorState.getCurrentContent()
    const blocks = editorState.getCurrentContent().getBlockMap()

    let entities = []

    // then find entity ranges in each changed block, store all entity keys
    blocks.forEach((block) => {
        // iterate through all characters, find all entities
        const charList = block.getCharacterList()

        charList.reduce((c, nc, ni) => {
            const entityKey = c.getEntity()
            if (!(entityKey === nc.getEntity())) {
                if (entityKey !== null && contentState.getEntity(entityKey).getType() === 'CONTENT_LINK') {
                    entities.push(entityKey)
                }
            }

            return nc
        })
    })
    
    return entities
}

function myBlockStyleFn(contentBlock) {
    const type = contentBlock.getType();
    if (type === 'ordered-list-item') {
        return 'ContentEditor-orderedListItem';
    }
    if (type === 'unordered-list-item') {
        return 'ContentEditor-unorderedListItem';
    }
    else {
        return ''
    }
}

class ContentEditor extends React.Component {
    constructor(props) {
        super(props)

        const initialEditorState = createInitialEditorState(props.editorState)

        this.state = {
            editorState: initialEditorState,
            entities: getAllEntities(initialEditorState),
            collapsed: !props.withToolbar, // without toolbar we start collapsed
            saveInProgress: false,
        }

        this.onChange = this.onChange.bind(this)
        this.getEditorState = this.getEditorState.bind(this)
        this.focus = this.focus.bind(this)

        this.persistState = this.persistState.bind(this)
        // this.persistState = _.debounce(this.persistState.bind(this), 1000)
        this.persistContentLinks = debounce(this.persistContentLinks.bind(this), 500)

        this.blockRenderMap = DefaultDraftBlockRenderMap.merge(
            this.customBlockRendering(props)
        );

    }

    componentWillMount() {
        const { showAddRelationWindow, removeEdge } = this.props

        const linkifyPlugin = createLinkifyPlugin()
        const linkPlugin = createLinkPlugin()
        const blockPlugin = createBlockPlugin()
        const inlinePlugin = createInlinePlugin()
        const contentLinkPlugin = createContentLinkPlugin({ nodeId: this.props.id, showAddRelationWindow, removeEdge })
        const latexPlugin = createLatexPlugin()
        const autoListPlugin = createAutoListPlugin()

        // TODO: workaround because ContentLinkButton isn't rendered in the tree but in toolbar plugin - 2016-07-07

        const ContentLinkButtonContainer = connect(null, { showAddRelationWindow, removeEdge })(ContentLinkButton)
        const ContentLinkButtonContainerProvider = (props) => (
            <Provider store={this.context.store}>
                <ContentLinkButtonContainer 
                    node={this.props.node}
                    nodeId={this.props.id}
                    {...props} 
                />
            </Provider>
        )

        const toolbarPlugin = createToolbarPlugin({
            theme: toolbarTheme,
            actions: [
                {
                    rule: (editorState, selectionState) => {
                        const contentState = editorState.getCurrentContent()

                        const startBlock = contentState
                            .getBlockForKey(selectionState.getStartKey());

                        const endBlock = contentState
                            .getBlockForKey(selectionState.getEndKey());

                        const blocks = contentState.getBlockMap()

                        const startKey = selectionState.getStartKey()
                        const endKey = selectionState.getEndKey()

                        // const selectedBlocks = contentState.slice(start, end)
                        let seenFirst = null
                        let seenLast = null
                        const selectedBlocks = blocks.filter((block, key, blockMap) => {
                            if (seenLast) return false;
                            if (key === startKey) {
                                seenFirst = true;
                                if (key === endKey) seenLast = true;
                                return true;
                            }
                            if (!seenFirst) return false;

                            if (key !== endKey) {
                                return true;
                            }
                            if (key === endKey) {
                                seenLast = true;
                                return true;
                            }
                            return false;
                        })

                        // only one type of block is selected
                        if (!selectedBlocks.reduce(
                            (acc, block) => block.getType() === acc && acc,
                            selectedBlocks.first().getType()
                        )) {
                            return false
                        }

                        return selectedBlocks.every(block => {
                            return ['unstyled', 'header-three', 'header-four', 'header-five', 'blockquote', 'code-block', 'unordered-list-item', 'ordered-list-item'].includes(block.getType()) && block.getText() !== '' 
                        })
                    },
                    components: !this.props.withoutContentLink ?
                        [ContentLinkButtonContainerProvider, Separator, BoldButtonWIcon, ItalicButtonWIcon, UnderlineButtonWIcon ]
                        : [LinkButton, Separator, BoldButtonWIcon, ItalicButtonWIcon, UnderlineButtonWIcon ],
                    // components: [LinkButton, Separator, BoldButtonWIcon, ItalicButtonWIcon, UnderlineButtonWIcon ],
                }
            ],
          // actions: [ContentLinkButtonContainerProvider, LinkButton, Separator, BoldButtonWIcon, ItalicButtonWIcon, UnderlineButtonWIcon ]
        }); 

        const mediaPlugin = createMediaPlugin()
        const uploadPlugin = createUploadPlugin({ handleUpload: this.props.handleUpload })

        this.plugins = [ latexPlugin, contentLinkPlugin, linkifyPlugin, linkPlugin, mediaPlugin, uploadPlugin, blockPlugin, inlinePlugin, toolbarPlugin, autoListPlugin ]
        // this.plugins = [ latexPlugin, linkifyPlugin, linkPlugin, mediaPlugin, uploadPlugin, blockPlugin, inlinePlugin, toolbarPlugin, autoListPlugin ]
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.id !== nextProps.id) {
            const newEditorState = createInitialEditorState(nextProps.editorState)
            return this.setState({
                editorState: newEditorState,
                entities: getAllEntities(newEditorState),
                collapsed: !nextProps.withToolbar, // without toolbar we start collapsed
            })
        }
    }

    persistContentLinks(editorState, prevEditorState) {
        // get diffs here for Entities
        // walk through all nested entities, see what entities were added, and what entities were removed. For all added entities do a request, for all removed entities do a request

        const prevEntities = this.state.entities

        const contentState = editorState.getCurrentContent()
        const blockMap = contentState.getBlockMap()

        const entities = getAllEntities(editorState)

        // diff the previous entities and the current entities
        const added = _.difference(entities, prevEntities)
        const removed = _.difference(prevEntities, entities)

        const addedPromises = added.map((entityKey) => {
            // add this entity remotely on the server

            const entity = contentState.getEntity(entityKey)

            const { node, nodeId, text } = entity.getData()

            return this.props.addEdge(this.props.id, nodeId, text)
                .then((action) => [ entityKey, action.response.result ])
                .catch(error => console.error(error.stack))
        })

        const removedPromises = removed.map((entityKey) => {
            // remove this entity remotely on the server

            const entity = contentState.getEntity(entityKey)
            const { edgeId } = entity.getData()

            return this.props.removeEdge(edgeId)
                .catch(e => {
                    console.error(e)
                })
        })

        // call some "add" event for every added entity, some "remove" event for every removed entity

        this.setState({
            entities,
        })

        // merge into contentState...
        return Promise.all(addedPromises)
            .then((actions) => {
                const newContentState = actions
                    .reduce((contentState, [ entityKey, edgeId ]) => contentState.mergeEntityData(entityKey, { edgeId }), contentState)

                return Promise.all(removedPromises)
                    .then(() => newContentState)
            })
    }

    onChange(editorState, methods, forceUpdate) {
        const prevContent = this.state.editorState.getCurrentContent()
        const content = editorState.getCurrentContent()

        if (forceUpdate || prevContent !== content) {
            this.setState({ saveInProgress: true }, () => {
                // the order here is important, because the function above still modifies the global Entity object
                this.persistContentLinks(editorState, this.state.editorState)
                    .then((newContentState) => this.persistState(newContentState))
                    .then(() => this.setState({ saveInProgress: false }))
            })
        }

        this.setState({
            editorState,
        })
    }

    persistState(contentState) {
        this.props.persistState(contentState)
    }

    focus() {
        if (this.state.collapsed) {
            this.setState({
                collapsed: false,
            })
        }

        this.editor.editor.focus()
    }

    handleClickOutside() {
        /*
         * when clicking outside of the editor
        */
        // if (!this.state.editorState.getCurrentContent().hasText()) {
            this.setState({ collapsed: true })
        // }
    }

    getEditorState() {
       return this.state.editorState 
    }

    customBlockRendering = props => {
        // const { blockTypes } = props;
        const newObj = {
            // paragraph: {
            //     element: 'p',
            // },
            // unstyled: {
            //     element: 'p',
            // },
            'latex': {
                element: 'div',
            },
            'inline-latex': {
                element: 'div',
            },
            'audio': {
                element: 'div',
            },
            'image': {
                element: 'div',
            },
            'video': {
                element: 'div',
            },
            'youtube': {
                element: 'div',
            },
        };
        // Object.keys(blockTypes).forEach(type => {
        //     newObj[type] = {
        //         element: 'div'
        //     };
        // });
        return Map(newObj);
    }

    render() {
        const { withToolbar, uiState } = this.props

        // If the user changes block type before entering any text, we can
        // either style the placeholder or hide it. Let's just hide it now.

        var contentState = this.state.editorState.getCurrentContent();
        const hidePlaceholder = !contentState.hasText() && contentState.getBlockMap().first().getType() !== 'unstyled'

        const rootClass = classNames('ContentEditor-root', {
            'ContentEditor-withToolbar': this.props.withToolbar,
        })
        const editorClass = classNames('ContentEditor-editor', {
            'ContentEditor-hidePlaceholder':  hidePlaceholder
        })

        return (
            <div className={ rootClass }>
                { !this.props.readOnly ?
                    <div>
                        <Prompt
                            when={!this.props.saved || this.state.saveInProgress}
                            message={location => (
                                `Saving is in progress, are you sure you want to leave the page?`
                            )}
                        />
                        <AddRelationWindow
                            id={uiState.windowProps.nodeId}
                            open={this.props.uiState.addRelationWindowOpened}
                            createNode={this.props.createNode}
                            addEdge={this.props.addEdge}
                            hideWindow={this.props.hideAddRelationWindow}
                            type={this.props.type}
                            collectionId={this.props.collectionId}
                            addNodeToCollection={this.props.addNodeToCollection}

                            editorState={this.state.editorState}
                            setEditorState={this.onChange}
                        />
                        <ConnectWindow
                            id={this.props.id}
                            open={this.props.uiState.connectWindowOpened}
                            editorState={this.state.editorState}
                            setEditorState={this.onChange}
                            hideConnectWindow={this.props.hideConnectWindow}
                            addEdge={this.props.addEdge}
                        />
                        <AddPictureWindow
                            open={uiState.addPictureWindowOpened && uiState.addPictureWindowOpened.opened}
                            getEditorState={this.getEditorState}  
                            setEditorState={this.onChange}
                            handleUpload={this.props.handleUpload}
                            hideWindow={this.props.hideAddPictureWindow}
                        />
                        <AddVideoWindow
                            open={uiState.addVideoWindowOpened && uiState.addVideoWindowOpened.opened}
                            getEditorState={this.getEditorState}  
                            setEditorState={this.onChange}
                            handleUpload={this.props.handleUpload}
                            hideWindow={this.props.hideAddVideoWindow}
                        />
                        <AddAudioWindow
                            open={uiState.addAudioWindowOpened && uiState.addAudioWindowOpened.opened}
                            getEditorState={this.getEditorState}  
                            setEditorState={this.onChange}
                            handleUpload={this.props.handleUpload}
                            hideWindow={this.props.hideAddAudioWindow}
                        />
                        <ContentEditorToolbar 
                            getEditorState={this.getEditorState}  
                            setEditorState={this.onChange}
                        />
                    </div>
                : null}

                <div className={ editorClass } onClick={this.focus}>
                    <Editor
                        key={this.props.id}
                        readOnly={this.props.readOnly}
                        blockRenderMap={this.blockRenderMap}
                        blockStyleFn={myBlockStyleFn}
                        editorState={this.state.editorState}
                        onChange={this.onChange}
                        plugins={this.plugins}
                        placeholder={this.props.readOnly ? "" : "Write your story..."}
                        spellCheck={true}
                        ref={(element) => { this.editor = element; }}
                    />
                </div>
                {
                    !this.props.readOnly ?  <ContentEditorShortcuts /> : null
                }
            </div>
        );
    }
}
ContentEditor.defaultProps = {
    withToolbar: true,
}
ContentEditor.contextTypes = {
    store: PropTypes.object.isRequired
}

export default enhanceWithClickOutside(ContentEditor)
